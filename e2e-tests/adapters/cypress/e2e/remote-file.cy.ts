Cypress.on("uncaught:exception", err => {
  if (
    (err.message.includes("Minified React error #418") ||
      err.message.includes("Minified React error #423") ||
      err.message.includes("Minified React error #425")) &&
    Cypress.env(`TEST_PLUGIN_OFFLINE`)
  ) {
    return false
  }
})

const PATH_PREFIX = Cypress.env(`PATH_PREFIX`) || ``

describe(
  `remote-file`,
  {
    retries: {
      runMode: 4,
    },
  },
  () => {
    beforeEach(() => {
      cy.visit(`/routes/remote-file/`).waitForRouteChange()

      // trigger intersection observer
      cy.scrollTo("top")
      cy.wait(200)
      cy.scrollTo("bottom", {
        duration: 600,
      })
      cy.wait(600)
    })

    async function testImages(images, expectations) {
      for (let i = 0; i < images.length; i++) {
        const expectation = expectations[i]

        const url = images[i].currentSrc

        const { href, origin } = new URL(url)
        const urlWithoutOrigin = href.replace(origin, ``)

        // using Netlify Image CDN
        expect(urlWithoutOrigin).to.match(/^\/.netlify\/images/)

        const res = await fetch(url, {
          method: "HEAD",
        })
        expect(res.ok).to.be.true

        const expectedNaturalWidth =
          expectation.naturalWidth ?? expectation.width
        const expectedNaturalHeight =
          expectation.naturalHeight ?? expectation.height

        if (expectation.width) {
          expect(
            Math.ceil(images[i].getBoundingClientRect().width)
          ).to.be.equal(expectation.width)
        }
        if (expectation.height) {
          expect(
            Math.ceil(images[i].getBoundingClientRect().height)
          ).to.be.equal(expectation.height)
        }
        if (expectedNaturalWidth) {
          expect(Math.ceil(images[i].naturalWidth)).to.be.equal(
            expectedNaturalWidth
          )
        }
        if (expectedNaturalHeight) {
          expect(Math.ceil(images[i].naturalHeight)).to.be.equal(
            expectedNaturalHeight
          )
        }
      }
    }

    it(`should render correct dimensions`, () => {
      cy.get('[data-testid="public"]').then(async $urls => {
        const urls = Array.from(
          $urls.map((_, $url) => $url.getAttribute("href"))
        )

        for (const url of urls) {
          // using OSS implementation for publicURL for now
          expect(url).to.match(new RegExp(`^${PATH_PREFIX}/_gatsby/file`))
          const res = await fetch(url, {
            method: "HEAD",
          })
          expect(res.ok).to.be.true
        }
      })

      cy.get(".resize").then({ timeout: 60000 }, async $imgs => {
        await testImages(Array.from($imgs), [
          {
            width: 100,
            height: 133,
          },
          {
            width: 100,
            height: 160,
          },
          {
            width: 100,
            height: 67,
          },
        ])
      })

      cy.get(".fixed img:not([aria-hidden=true])").then(
        { timeout: 60000 },
        async $imgs => {
          await testImages(Array.from($imgs), [
            {
              width: 100,
              height: 133,
            },
            {
              width: 100,
              height: 160,
            },
            {
              width: 100,
              height: 67,
            },
          ])
        }
      )

      cy.get(".constrained img:not([aria-hidden=true])").then(
        { timeout: 60000 },
        async $imgs => {
          await testImages(Array.from($imgs), [
            {
              width: 300,
              height: 400,
            },
            {
              width: 300,
              height: 481,
            },
            {
              width: 300,
              height: 200,
            },
          ])
        }
      )

      cy.get(".full img:not([aria-hidden=true])").then(
        { timeout: 60000 },
        async $imgs => {
          await testImages(Array.from($imgs), [
            {
              naturalHeight: 1333,
            },
            {
              naturalHeight: 1603,
            },
            {
              naturalHeight: 666,
            },
          ])
        }
      )
    })

    it(`should render a placeholder`, () => {
      cy.get(".fixed [data-placeholder-image]")
        .first()
        .should("have.css", "background-color", "rgb(232, 184, 8)")
      cy.get(".constrained [data-placeholder-image]")
        .first()
        .should($el => {
          expect($el.prop("tagName")).to.be.equal("IMG")
          expect($el.prop("src")).to.contain("data:image/jpg;base64")
        })
      cy.get(".constrained_traced [data-placeholder-image]")
        .first()
        .should($el => {
          // traced falls back to DOMINANT_COLOR
          expect($el.prop("tagName")).to.be.equal("DIV")
          expect($el).to.be.empty
        })
      cy.get(".full [data-placeholder-image]")
        .first()
        .should($el => {
          expect($el.prop("tagName")).to.be.equal("DIV")
          expect($el).to.be.empty
        })
    })
  }
)
